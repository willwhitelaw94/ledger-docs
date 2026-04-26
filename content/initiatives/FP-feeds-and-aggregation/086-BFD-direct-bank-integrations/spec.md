---
title: "Feature Specification: Direct Bank Integrations"
---

# Feature Specification: Direct Bank Integrations

**Epic**: 086-BFD | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 004-BFR (Bank Feeds & Reconciliation), 048-FPL (Feed Pipeline)

---

## Problem Statement

MoneyQuest currently relies on Basiq as a single aggregator for bank feeds. Direct bank integrations (Open Banking CDR in Australia, PSD2 in EU) provide higher reliability, real-time data, richer transaction metadata, and lower per-connection cost at scale. Xero has 1,000+ direct bank connections. Single-aggregator dependency is a business risk.

## Scope

### In Scope (P1)
- Consumer Data Right (CDR) accredited data recipient registration pathway
- Direct API integration with Big 4 AU banks (CBA, NAB, Westpac, ANZ) via CDR
- Multi-provider feed architecture: abstract FeedProvider interface, Basiq as fallback
- Connection consent management UI (CDR consent flow)
- Real-time transaction webhooks (where supported)
- Connection health monitoring and automatic reconnection

### In Scope (P2)
- 50+ Australian bank/credit union connections
- International bank connections via Plaid (US/UK/EU)
- PSD2 compliance for European expansion
- Bank statement PDF import as fallback (OCR extraction)
- Connection migration tool (move users from Basiq to direct without data loss)
- Feed latency SLA dashboard

### In Scope (P3)
- 200+ global bank connections
- Crypto exchange feeds (Coinbase, Binance, Kraken)
- Payment initiation (CDR action initiation when available)
- Multi-bank balance aggregation dashboard

### Out of Scope
- Becoming a CDR-accredited data recipient (outsource to Frollo/Basiq CDR layer initially)
- Credit score or lending integration
- Bank account opening

## Key Entities
- `FeedProvider` — Provider abstraction: name, type (aggregator|direct|cdr), api_config
- `BankConnection` — workspace_id, provider_id, institution, consent_id, status, last_sync_at, expires_at
- `ConnectionHealthLog` — connection_id, check_at, status, latency_ms, error

## Success Criteria
- Big 4 bank feeds via CDR within 6 months of CDR accreditation
- Feed latency < 4 hours for 95% of connections (vs 24h+ via aggregator)
- Connection uptime > 99.5%
- Zero data loss during provider migration
