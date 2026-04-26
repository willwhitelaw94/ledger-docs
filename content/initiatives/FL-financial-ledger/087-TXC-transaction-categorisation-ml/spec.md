---
title: "Feature Specification: Transaction Categorisation ML"
---

# Feature Specification: Transaction Categorisation ML

**Epic**: 087-TXC | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 004-BFR (Bank Feeds), 021-BRR (Bank Reconciliation Rules)

---

## Problem Statement

Bank transaction categorisation is currently rule-based (021-BRR). Users manually create rules or categorise transactions one by one. Xero's categorisation learns from user behaviour across millions of transactions. ML-based categorisation dramatically reduces manual bookkeeping time.

## Scope

### In Scope (P1)
- Transaction embedding model: vectorise description + amount + merchant into feature space
- Per-workspace learning: train on user's historical categorisation decisions
- Suggestion engine: predict chart account, tax code, and contact for unmatched transactions
- Confidence scoring: high (auto-apply), medium (suggest), low (no suggestion)
- User feedback loop: accept/reject/correct suggestions to improve model
- Merchant name normalisation (clean_description extraction from raw bank descriptions)

### In Scope (P2)
- Cross-workspace learning: anonymous aggregate patterns (e.g., "WOOLWORTHS" → Grocery Expense across all workspaces)
- Industry-specific models (retail, professional services, construction, hospitality)
- Recurring transaction detection (auto-identify subscriptions, loan repayments)
- Split transaction suggestion (e.g., Costco receipt → part supplies, part entertainment)
- Categorisation accuracy dashboard (% auto-matched over time)

### In Scope (P3)
- Real-time categorisation on feed import (zero-touch bookkeeping)
- Natural language override ("this is office supplies")
- Anomaly flagging (unusual merchant, unusual amount for category)
- Accountant review queue (AI-categorised transactions pending accountant verification)

### Out of Scope
- Receipt OCR matching (separate feature)
- AI-generated journal entries (separate from 020-AIB)
- Fraud detection (separate concern)

## Key Entities
- `TransactionEmbedding` — bank_transaction_id, embedding_vector, merchant_normalised
- `CategorisationSuggestion` — transaction_id, predicted_account_id, predicted_tax_code, predicted_contact_id, confidence, accepted
- `CategorisationModel` — workspace_id, model_version, training_count, accuracy_score, last_trained_at

## Success Criteria
- 70%+ auto-categorisation accuracy within 3 months of workspace usage
- 90%+ accuracy for workspaces with 12+ months of history
- Suggestion latency < 100ms per transaction
- 50% reduction in manual categorisation time
