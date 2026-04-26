---
title: "Idea Brief: Feed Pipeline Infrastructure"
---

# Idea Brief: Feed Pipeline Infrastructure

**Created**: 2026-03-19
**Author**: William Whitelaw

---

## Problem Statement (What)

- Every new external data source (bank feeds, asset prices, property valuations) requires a **bespoke integration** with its own scheduling, error handling, retry logic, and journal entry generation
- The existing `BankFeedProviderInterface` works well for bank transactions but is **tightly coupled** to the banking domain — it can't be reused for asset price feeds, SMSF data, or market data without significant duplication
- The rules engine (`BankFeedRule`) is bank-transaction-specific — it can't classify items from other feed types
- There is no unified model for tracking what data has been ingested, what's been processed, and what needs attention — each source manages its own state
- As MoneyQuest scales to 7+ feed source types (banks, Redbook, ASX, RP Data, Sharesight, Class Super, BGL), fragmented integrations become unmaintainable

**Current State**: Bank feeds work well via Basiq (010-PLT) with 3-pass matching (exact → fuzzy → rule). But this architecture is locked to `BankTransaction` and `BankFeedRule` models — no reuse path for other data sources. Adding a second feed type today would mean duplicating ~80% of the pipeline code.

---

## Possible Solution (How)

A universal feed pipeline that any data source plugs into — one set of abstractions for ingestion, classification, JE generation, and monitoring across all feed types.

- **FeedSource model** — universal representation of any external data connection (replaces per-source connection tracking)
- **FeedItem model** — canonical shape for any ingested data item with lifecycle status tracking (pending → classified → posted)
- **FeedProvider interface** — generalisation of `BankFeedProviderInterface` that any source implements (Basiq, Redbook, ASX, RP Data, etc.)
- **FeedProcessor service** — orchestrates the full pipeline: classify → transform → generate JE → notify
- **Generalised rules engine** — `BankFeedRule` expanded to `FeedRule` with feed_type scope, so rules work across any source
- **FeedScheduler** — unified scheduling and retry across all sources (replaces per-source cron jobs)
- **Entity feed view** — infinite scroll UI showing all feed items across sources for a workspace

```
// Before: Each source is bespoke
BankFeedProviderInterface → BasiqProvider → BankTransaction → BankFeedRule → ReconcileTransaction
[Next source?] → ??? → ??? → ??? → ???  (start from scratch)

// After: Universal pipeline, any source plugs in
FeedProvider interface → BasiqProvider, RedbookProvider, AsxProvider, ...
    ↓
FeedSource → FeedItem → FeedRule (type-scoped) → FeedProcessor → JournalEntry
    ↓
Entity Feed UI + User Activity Feed (050-UAF) + Intray (018-ITR)
```

---

## Benefits (Why)

**User/Client Experience**:
- New feed sources go live in days not weeks — each new provider is just an interface implementation
- Unified feed view shows all incoming data in one place — users stop context-switching between banking, investments, property

**Operational Efficiency**:
- ~80% code reuse across feed sources — shared scheduling, retry, error handling, monitoring
- Single rules engine for all classification — rules learned from bank transactions inform other sources

**Business Value**:
- Unlocks the entire asset price feeds epic (049-APF) — without the pipeline, each source is a standalone project
- Enables the intelligence layer (health scores, nudges, pulse reports) by providing a unified data stream
- Competitive parity with myProsperity's 27-provider integration breadth, but with a ledger underneath

**ROI**: Foundation infrastructure — every subsequent feed source epic (049-APF, investment platforms, SMSF) builds on this rather than reinventing. Estimated 3-5x reduction in per-source development effort.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- The existing `BankFeedProviderInterface` and banking models are the right starting point for generalisation
- Bank transactions will be the first (and most complex) provider migrated to the new pipeline
- Other feed sources (049-APF) will not start development until the pipeline foundation is in place

**Dependencies**:
- 004-BFR Bank Feeds & Reconciliation (existing — migrates to become first FeedProvider)
- 010-PLT Platform Integrations (existing — Basiq provider migrates)
- 021-BRR Bank Reconciliation Rules (existing — rules engine generalises)
- 002-CLE Core Ledger Engine (JE creation flows through existing event-sourced pipeline)

**Risks**:
- Migration complexity (HIGH) → Mitigation: Wrap existing banking models with adapter layer rather than rewriting; existing tests must pass unchanged
- Feed type proliferation (MEDIUM) → Mitigation: Strict interface contract — all providers must implement the same lifecycle; no per-source special cases in the processor
- Performance at scale (MEDIUM) → Mitigation: Queue-based processing from day one; idempotent ingestion; debounced downstream triggers

---

## Estimated Effort

**L (Large) — 3-4 sprints**, approximately 40-55 story points

- **Sprint 1**: Core models & abstractions — FeedSource, FeedItem, FeedProvider interface, FeedRule generalisation, migrations
- **Sprint 2**: FeedProcessor service & scheduler — pipeline orchestration, queue jobs, retry logic, Basiq migration to new pipeline
- **Sprint 3**: Entity feed UI — infinite scroll view, status filtering, inline actions, feed health dashboard
- **Sprint 4**: Polish & migration — migrate existing bank feed tests, performance testing, monitoring, documentation

---

## Proceed to PRD?

**YES** — This is the foundational infrastructure for 6+ downstream epics (049-APF, 050-UAF, 051-EHS, 052-ABN, 053-PLS, 040-AND). A detailed spec already exists at `spec.md`. Ready for implementation planning.

---

## Decision

- [ ] **Approved** — Proceed to PRD
- [ ] **Needs More Information** — [What's needed?]
- [ ] **Declined** — [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Run `/speckit-specify` to refine the spec into implementation-ready stories
2. [ ] Run `/speckit-plan` to create technical implementation plan
3. [ ] Run `/speckit-tasks` to break into development tasks
4. [ ] Begin Sprint 1: Core models & abstractions
